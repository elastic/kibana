# Unified Case Attachment Architecture

This document describes the layered architecture for case attachments: how HTTP requests are decoded (legacy and unified formats), validated, passed through the service layer, dual-written to saved objects (SOs), and how reads from both SOs are merged and returned for rendering.

---

## 1. Overview

Case attachments can be created in two formats:

- **Legacy (v1)**: Type-specific top-level fields (e.g. `comment`, `alertId`, `eventId`, `externalReferenceId`, …). Stored in **`cases-comments`** SO type.
- **Unified (v2)**: Two shapes—**value** (`type` + `data` [+ `metadata`]) and **reference** (`type` + `attachmentId` [+ `metadata`]). Stored in **`cases-attachments`** SO type when the feature is enabled.

The system supports **dual write** (feature flag chooses SO type for new writes) and **dual read** (find/bulkGet query both SO types and merge). The API accepts **both** legacy and unified payloads; a **naming/type mapping layer** and **schema validation** (per registered type) sit in front of the service layer.

---

## 2. Layers (Write Path)

### 2.1 HTTP → Route

| Entry point | Request body | Handler |
|-------------|--------------|--------|
| **POST** `CASE_COMMENTS_URL` (public) | Single `AttachmentRequest` (legacy or unified) | `post_comment.ts` → `casesClient.attachments.add({ caseId, comment })` |
| **POST** `INTERNAL_BULK_CREATE_ATTACHMENTS_URL` (internal) | Array of attachments (legacy or unified) | `bulk_create_attachments.ts` → `casesClient.attachments.bulkCreate({ caseId, attachments })` |

No schema validation at route level; body is passed through as-is to the client.

### 2.2 Request decode (both types)

**Location**: `server/client/attachments/add.ts`, `bulk_create.ts`; shared types in `common/types/api/attachment/v2.ts`.

- **Single add**: Body is decoded with **`AttachmentRequestRtV2`** = `AttachmentRequestRt | UnifiedAttachmentPayloadRt`. So the request is valid if it matches either legacy or unified shape.
- **Bulk create**: Body is decoded with **`BulkCreateAttachmentsRequestRtV2`** (array of `AttachmentRequestRtV2`).

Decode is **format-agnostic**: it only checks that the payload is one of the two allowed shapes. It does not run type-specific schema validation yet.

### 2.3 Naming / type mapping layer

**Location**: `common/attachments/type_mapper.ts`; used in client add/bulk_create and in attachment service when normalizing type names.

- **Purpose**: Map between **legacy** and **unified** type names for the same concept (e.g. `user` ↔ `comment`).
- **Functions**:
  - `toUnifiedAttachmentType(type)` → legacy `user` → `comment`; others pass through.
  - `toLegacyAttachmentType(type)` → unified `comment` → `user`; others pass through.
- **Usage**:
  - In **add.ts**: When request is unified value and type is comment, convert to legacy shape for downstream (e.g. `AttachmentType.user` + `comment` + `owner`) so the rest of the pipeline can work with one representation if needed.
  - In **bulk_create.ts**: `getAttachmentTypeTransformers(normalizedType)` uses the same mapping to decide if an attachment has old/new format and which SO type to target (from config).
  - In **attachment service** (create/bulkCreate): `toUnifiedAttachmentType(decodedAttributes.type)` before deciding schema transform and SO type.

So this layer normalizes **type names** and, in the client, can **normalize request shape** (unified → legacy) for the model when the pipeline expects legacy.

### 2.4 Validation (decode + registry schema validators)

**Location**: `server/client/utils.ts` (`decodeCommentRequest`), `server/client/attachments/validators.ts` (`validateRegisteredAttachments`).

Two steps:

1. **decodeCommentRequest(comment, externalRefRegistry, unifiedRegistry)**  
   - **Legacy**: Dispatches by type (user, alert, event, externalReference, persistableState, actions) and runs the appropriate domain rt (e.g. `UserCommentAttachmentPayloadRt`, `AlertAttachmentPayloadRt`) and, for external ref, the **external reference** registry’s `schemaValidator(metadata)`.  
   - **Unified**: If value → **decodeUnifiedValueAttachment(comment, unifiedRegistry)** (type must be registered, then `schemaValidator(comment.data)`). If reference → **decodeUnifiedReferenceAttachment(comment, unifiedRegistry)** (type must be registered, then `schemaValidator(comment.metadata ?? null)`).

2. **validateRegisteredAttachments({ query, … registries })**  
   - For **unified** requests: ensures `query.type` is in the unified registry; then runs the type’s **schemaValidator** on:
     - **Value**: `query.data`
     - **Reference**: `query.metadata ?? null`

So **both** legacy (per-type + external ref validator) and unified (registry + schemaValidator for value/reference) are validated before the request is passed to the model.

### 2.5 Client → Model → Service

- **add**: After decode and validation, client builds `transformedComment` (legacy shape for model), then **CaseCommentModel.create(caseId)** → **model.createComment({ createdDate, commentReq: transformedComment, id })**.  
  Model calls **attachmentService.create({ attributes, references, id, refresh })**. Attributes are already in the shape the model uses (e.g. `transformNewComment(...)` for legacy, or the model can pass unified attributes when it’s a unified-only path).

- **bulkCreate**: Client normalizes each attachment (optionally to unified format if feature flag says “write to new SO”), then **CaseCommentModel.bulkCreate({ attachments })**. Model maps each item to either:
  - Legacy: `attributes: transformNewComment(...)`, references from legacy refs.
  - Unified: `attributes: transformNewUnifiedComment(...)`, references from unified refs.  
  Then **attachmentService.bulkCreate({ attachments: [...], refresh })**.

So the **model** is the boundary that turns “comment request” (legacy or normalized) into “attributes + references” for the attachment service; the **attachment service** then decides SO type and schema transform.

### 2.6 Attachment service: SO type selection and schema transform

**Location**: `server/services/attachments/index.ts` (create, bulkCreate).

- **SO type**: `getAttachmentSavedObjectType(this.context.config)` → `cases-attachments` if `config.attachments?.enabled`, else `cases-comments`.
- **Schema**:
  - If target SO is **cases-attachments** and the payload is legacy **comment** (user): **commentAttachmentTransformer.toNewSchema(oldAttributes)** → unified value shape (`type: 'comment'`, `data: { content }`, common attrs). Owner can be stored in `metadata.owner`.
  - If target SO is **cases-attachments** and the payload is already unified: use as-is (possibly with metadata.owner for comment).
  - If target SO is **cases-comments**: write legacy attributes as-is (no transform to unified).
- **Extract refs**: `extractAttachmentSORefsFromAttributes(attributesToWrite, references, persistableStateRegistry)` so refs (e.g. case, external refs) are stored in SO references, not in attributes.
- **Write**: **unsecuredSavedObjectsClient.create(type, extractedAttributes, { references, id, refresh })** or **bulkCreate(processedForBulk, { refresh })**. So a **single** SO type is written per request (either `cases-comments` or `cases-attachments`), i.e. **dual write** is “write to one of two SOs depending on config,” not “write to both in one request.”

### 2.7 Dual write summary

- **One** attachment is stored in **one** SO type per create:
  - **cases-comments** when `config.attachments?.enabled` is false or when the code path uses the legacy SO.
  - **cases-attachments** when `config.attachments?.enabled` is true and the attachment is written in unified form (e.g. comment transformed to new schema).
- “Dual write” here means the **system** can write to either SO depending on config and format; over time, new data may go to `cases-attachments` while old data remains in `cases-comments`.

---

## 3. Read path: from SOs to attachments for rendering

### 3.1 Entry points that need attachments

- **Find attachments for a case**: GET find-comments (or equivalent) → **client.attachments.find({ caseID, findQueryParams })** → used for case detail “comments” list.
- **Bulk get by ids**: **client.attachments.bulkGet({ caseID, attachmentIDs })** → used e.g. by **find user actions** to resolve `latestAttachments` for the activity timeline (user actions return comment_ids; attachments are fetched by those ids and returned as `latestAttachments` for rendering).

### 3.2 Find (list attachments for a case)

**Location**: `server/services/attachments/index.ts` (AttachmentService.find).

- **SO types to query**: `[CASE_COMMENT_SAVED_OBJECT]` always; if `config.attachments?.enabled` then also `CASE_ATTACHMENT_SAVED_OBJECT`. So **both** SO types are queried in a **single** `savedObjectsClient.find({ type: typesToQuery, filter, sortField, ... })`.
- **Filter**: Case association is via `hasReference` (reference to the case). Filter may be adapted so it doesn’t depend on SO type prefix (e.g. strip type prefix so it works for both).
- **Response**: Each hit has `type` (so we know which SO it came from). For each doc:
  - If it’s from **cases-attachments** and is a comment (type `comment`, has `data.content`): **commentAttachmentTransformer.toOldSchema(newAttributes, owner)** to convert to legacy shape (type `user`, `comment`, `owner`). Owner comes from `metadata.owner` or a fallback.
  - Then **injectAttachmentSOAttributesFromRefs** (reconstitute refs into attributes where needed).
  - Decode with **AttachmentTransformedAttributesRt** so the returned shape is the **transformed (legacy-like) attributes** for backward compatibility.
- **Return**: `{ page, per_page, total, saved_objects: validatedAttachments }` so the API and UI see a single list of attachments in a consistent (legacy) shape for rendering.

### 3.3 BulkGet (by attachment ids)

**Location**: `server/services/attachments/operations/get.ts` (AttachmentGetter.bulkGet).

- **Strategy**: For each id we don’t know which SO it lives in, so we **try both**:
  - First **bulkGet** from **cases-attachments** for all ids.
  - For any id that returned an error or missing attributes, **bulkGet** from **cases-comments** for those ids.
  - **Merge**: Prefer new SO result when present, else fallback to old SO.
- **Transform**: For each successful doc, if it’s from **cases-attachments** and is a comment attachment, **commentAttachmentTransformer.toOldSchema(...)** to legacy shape; then **injectAttachmentSOAttributesFromRefs**. Decode with **AttachmentTransformedAttributesRt**.
- **Return**: List of attachments (and errors) in the same transformed shape so callers (e.g. find user actions route) can return **latestAttachments** for rendering without caring which SO they came from.

### 3.4 Rendering

- **Case detail / activity**: The UI typically loads **user actions** (timeline) and then **bulkGet** attachments by the comment_ids from those user actions. The response is **latestAttachments** in legacy shape; the UI renders each comment/attachment using that shape.
- **Find comments**: Direct find returns a paginated list of attachments in the same transformed shape; the UI renders that list.

So **all reads** are normalized to the **same (legacy) attribute shape** for the API and rendering; the dual SOs are an implementation detail behind the attachment service.

---

## 4. Flow charts

### 4.1 Write path (single attachment, high level)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  HTTP: POST /api/cases/{case_id}/comments  or  POST internal/.../attachments   │
│  Body: AttachmentRequest (legacy) | UnifiedAttachmentPayload (unified)         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  REQUEST DECODE (both types)                                                      │
│  AttachmentRequestRtV2 / BulkCreateAttachmentsRequestRtV2                        │
│  → Validates shape is either legacy or unified (no type-specific rules yet)      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  NAMING / TYPE MAPPING                                                            │
│  toUnifiedAttachmentType(type) e.g. user → comment                                │
│  Client may normalize unified → legacy for model (add) or keep unified (bulk)    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  VALIDATION                                                                       │
│  decodeCommentRequest: legacy (domain rts + externalRef.schemaValidator)          │
│                       unified value → decodeUnifiedValueAttachment (validator)   │
│                       unified ref  → decodeUnifiedReferenceAttachment (validator)│
│  validateRegisteredAttachments: unified type in registry, schemaValidator(data)  │
│                                 or schemaValidator(metadata)                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  CLIENT → MODEL                                                                    │
│  CaseCommentModel.createComment(...) or bulkCreate({ attachments })               │
│  Model builds { attributes, references, id } per attachment                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ATTACHMENT SERVICE (create / bulkCreate)                                         │
│  • getAttachmentSavedObjectType(config) → cases-comments | cases-attachments     │
│  • If new SO + comment: commentAttachmentTransformer.toNewSchema(old)            │
│  • extractAttachmentSORefsFromAttributes(attributes, references)                 │
│  • unsecuredSavedObjectsClient.create(type, attributes, { references, id })      │
│    or bulkCreate(processedForBulk)                                               │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  SAVED OBJECTS                                                                    │
│  Single write per attachment to either:                                           │
│  • cases-comments (legacy schema), or                                             │
│  • cases-attachments (unified schema)                                             │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Read path (find and bulkGet → rendering)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  HTTP: GET find comments  or  Internal: find user actions + bulkGet attachments   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  FIND ATTACHMENTS                                                                 │
│  typesToQuery = [cases-comments]; if config.attachments?.enabled add             │
│                 [cases-attachments]                                               │
│  savedObjectsClient.find({ type: typesToQuery, hasReference: caseRef, ... })     │
└─────────────────────────────────────────────────────────────────────────────────┘
         OR
┌─────────────────────────────────────────────────────────────────────────────────┐
│  BULK GET ATTACHMENTS                                                             │
│  bulkGet(cases-attachments, ids) first; for missing/errors                        │
│  bulkGet(cases-comments, those ids); merge results (new SO wins when present)   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  TRANSFORM (new schema → old schema for API/UI)                                    │
│  For each doc from cases-attachments that is comment type:                        │
│    commentAttachmentTransformer.toOldSchema(newAttributes, owner)                 │
│  injectAttachmentSOAttributesFromRefs(so)                                        │
│  Decode with AttachmentTransformedAttributesRt                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  RETURN                                                                           │
│  find: { page, per_page, total, saved_objects } (all in legacy attribute shape)  │
│  bulkGet: { attachments, errors } (same shape)                                    │
│  Find user actions route: { userActions, latestAttachments }                      │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  RENDERING                                                                        │
│  UI consumes attachments in legacy shape (e.g. type, comment, owner, alertId…)   │
│  Activity timeline: user actions + latestAttachments → comment components        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Layer summary (compact)

| Layer | Where | Responsibility |
|-------|--------|----------------|
| HTTP / Route | `routes/api/comments/post_comment.ts`, `routes/api/internal/bulk_create_attachments.ts` | Receive body, call client add/bulkCreate. |
| Request decode (both types) | `client/attachments/add.ts`, `bulk_create.ts`; `AttachmentRequestRtV2`, `BulkCreateAttachmentsRequestRtV2` | Ensure body is legacy or unified; no type-specific validation. |
| Naming mapping | `common/attachments/type_mapper.ts`; client + service | Map user↔comment; client may normalize unified→legacy for model. |
| Validation | `client/utils.ts` (decodeCommentRequest, decodeUnifiedValue/ReferenceAttachment), `client/attachments/validators.ts` | Legacy: domain rts + external ref schemaValidator. Unified: registry + schemaValidator(data) or schemaValidator(metadata). |
| Client → Model | `client/attachments/add.ts`, `bulk_create.ts` → `CaseCommentModel` | Build attributes + references, call model createComment/bulkCreate. |
| Service (SO choice + transform) | `services/attachments/index.ts` | Choose SO type from config; transform comment to new schema if writing to cases-attachments; extract refs; create/bulkCreate. |
| Dual write | Same | One SO type per write: either cases-comments or cases-attachments. |
| Read (find / bulkGet) | `services/attachments/index.ts` (find), `operations/get.ts` (bulkGet) | Query one or both SO types; merge; transform new→old; inject refs; return legacy shape. |
| Rendering | Consumer (e.g. find user actions → latestAttachments) | Use returned attachments in legacy shape. |

---

## 5. Key file reference

| Concern | File(s) |
|--------|---------|
| Request types (both formats) | `common/types/api/attachment/v2.ts` (AttachmentRequestRtV2, BulkCreateAttachmentsRequestRtV2) |
| Type naming | `common/attachments/type_mapper.ts` |
| Decode + validation | `server/client/utils.ts`, `server/client/attachments/validators.ts` |
| Client add / bulkCreate | `server/client/attachments/add.ts`, `bulk_create.ts` |
| Model | `server/common/models/case_with_comments.ts` |
| Attachment service (create, bulkCreate, find) | `server/services/attachments/index.ts` |
| Attachment getter (bulkGet) | `server/services/attachments/operations/get.ts` |
| Comment schema transform | `server/services/attachments/schema_transformer/comment.ts` |
| Comment schema (shared) | `server/attachment_framework/schemas/comment_attachment_data.ts` |
| SO types | `server/saved_object_types/comments/index.ts`, `server/saved_object_types/attachments/index.ts` |
| Find user actions + latestAttachments | `server/routes/api/internal/find_user_actions.ts` |
