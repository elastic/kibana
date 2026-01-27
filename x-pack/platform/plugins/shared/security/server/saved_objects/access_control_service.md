### Access Control Service

In addition to Kibana’s traditional role-based access control (RBAC), certain Saved Object types now support object-level access control permissions. This allows us to enforce ownership, and custom access modes beyond the “all or read” space-level privileges.

The Access Control Service (ACS) is responsible for evaluating these additional rules before allowing create, update, delete, or access‑control‑change operations on write‑restricted Saved Objects.

Here’s how it works in the context of the Saved Objects Repository (SOR) security extension flow:

When the Security Extension intercepts an operation, it delegates to ACS to determine whether the object type supports access control and if object‑level rules should be applied. The rules being:

- Objects need to support access control, which is determined during SO registration.
- An object, when in write_restricted mode, can only be modified by the current owner or the Kibana admin.
- An object, which supports access control, but is in default accessMode can be modified by anyone who has the appropriate space-level privileges.

ACS returns either an empty set (no further checks needed) or a list of objects requiring RBAC verification.

This ensures that access decisions combine both access control rules (ownership, sharing, etc.) and regular RBAC privilege checks before the operation is authorized.

The following sequence diagram shows how ACS is invoked for different scenarios: creation, modification, deletion, and access control changes, and how its results integrate with the overall authorization flow.

```mermaid
sequenceDiagram
  actor C as SavedObjectsClient
  actor SOR as Repository
  actor SE as Security Extension
  actor ACS as Access Control Service



C->>SOR: Create write restricted SO
SOR->>SE: AuthorizeCreate
SE->>ACS: Check if type supports access control
ACS->>SE: Objects requiring further checks
SE->>SE: Regular RBAC privilege checks - throws if failure
SE->>SOR: Authz Result (create if authorized)
SOR->>C: Created object



C->>SOR: Update/Delete write restricted SO
SOR->>SE: calls respective authz function
SE->>SE: internal Authorize
SE->>ACS: Check access control logic (owner or admin with privilege)
ACS->>SE: List of objects requiring further RBAC checks
SE->>SE: Regular RBAC privilege checks - throws if failure
SE->>SOR: Authorization result (perform action if authorized)
SOR->>SOR: Perform action


C->>SOR: Change Access Control(owner or accessMode)
SOR->>SE: authorizeChangeAccessControl
SE->>ACS: Enforce accessControl logic (owner or admin with privilege)
ACS->>SE: List of objects requiring further RBAC checks
SE->>SE: Regular RBAC privilege checks - throws if failure
SE->>SOR: Authorization Result
SOR->>C: Object updated with new accessControl data
```
