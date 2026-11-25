# Agent Knowledge

Wiki pages that workflows read before an agent step and add entries to after a decision. A page
is Markdown about one thing, such as a detection rule, and is stored under that thing's stable
id, so renaming it does not lose the page.

Pages are kept by the shared wiki page store in `@kbn/agent-knowledge-wiki`, the same store other
products use with their own page types and index. This plugin adds the registry and the two
workflow steps.

## Registering a wiki

A plugin registers its wiki in `setup`, binding the id that workflows use to the index that holds
the pages and to the page types it allows:

```ts
agentKnowledge.registerWiki({
  id: 'my-wiki',
  index: 'my-wiki-pages',
  pageTypes: { detection_rule: { entriesHeading: 'Decision history' } },
});
```

The steps refuse a wiki id or page type that nothing registered.

## Steps

- `agentKnowledge.recallPage` reads one page by type and key. A page that does not exist returns
  `found: false`; so does a document under the page's id that the store does not read as a page.
  Any other failure fails the step.
- `agentKnowledge.recordEntry` adds one entry under the page type's entries heading, creating the
  page when it does not exist. Entries are only ever added. An entry id the page already has
  changes nothing, so a replayed step is safe. The write checks the version it read and retries
  when another writer changed the page in between. A page has a size limit, and an entry that
  would take it past the limit fails the step instead of truncating anything.

A key is lowercase letters, digits and `-`, at most 80 characters, because the store folds any
other slug into that form. Pages are scoped to the workflow's space through the stored document id.

## Identity

Both steps use the workflow's scoped Elasticsearch client and nothing else. Elasticsearch decides
what a workflow may read and write: the identity the workflow runs as needs `read`, `index` and,
when the index may not exist yet, `auto_configure` or `create_index` on the wiki's index. A
refused read or write fails the step with a `PermissionError`, and the audit log names that
identity.

The plugin registers no Kibana feature or privilege of its own.

## Stored document

| Field | Content |
| --- | --- |
| `_id` | `<space id>:wiki_<page type>_<key>` |
| `type` | The page type |
| `title`, `content` | The page; the title is rewritten on every entry |
| `tags` | `wiki`, the page type |
| `attributes.status` | Always `established`: every entry records a decision a person made |
| `attributes.entry_ids` | Ids of the entries on the page, in order |
| `attributes.slug`, `attributes.space_id` | The key and the space |
| `attributes.version` | Incremented on every write |
| `attributes.workflow_execution_id`, `attributes.conversation_id` | The last writer |
