# Google Drive Data Source

The Google Drive data source connects to a user's Google Drive to search, browse, and read documents. It is the primary tool for finding business documents, shared knowledge, and file content stored in Google Workspace.

## When to Use

Use this skill when the user asks about:
- **Business documents**: Finding reports, proposals, strategy documents, design docs, or any files stored in Google Drive.
- **Meeting notes and decisions**: Locating notes from meetings, shared agendas, or action items captured in Google Docs.
- **Spreadsheets and data**: Finding shared spreadsheets with project plans, budgets, metrics, or tracking data.
- **Presentations**: Locating slide decks for team updates, project reviews, or customer-facing materials.
- **File organization**: Listing contents of shared folders, understanding folder structure, or checking file metadata like ownership and sharing permissions.

## Tips

- Use `search` with Google Drive query syntax to find files by name, content, type, or owner.
- Use `list` to browse the contents of a specific folder when the user knows where files are organized.
- Use `download` to extract the text content of documents (PDFs, Word docs, Google Docs) so you can read and summarize them. The `rerank` option helps surface the most relevant passages for a given question.
- Use `metadata` to check file details like who owns a file, when it was last modified, or who it's shared with.
- When the user asks about a topic, start with `search` to find relevant files, then `download` to read their contents.
