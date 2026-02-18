# Notion Data Source

The Notion data source connects to a user's Notion workspace to search pages, query databases, and read page content. It is the primary tool for accessing structured knowledge bases, wikis, and project tracking data stored in Notion.

## When to Use

Use this skill when the user asks about:
- **Knowledge bases and wikis**: Finding documentation, runbooks, onboarding guides, or team knowledge stored in Notion pages.
- **Project tracking**: Querying Notion databases used for task tracking, sprint planning, roadmaps, or OKRs.
- **Structured data**: Accessing Notion databases (tables) with filtering capabilities to find specific records based on column values.
- **Team information**: Locating team directories, process documentation, or organizational information maintained in Notion.

## Tips

- Use `search` to find pages or databases by title. Set `query_object` to `page` for pages or `data_source` for databases.
- Use `query_data_source` to retrieve rows from a Notion database with optional filtering by column values. First use `get_data_source` to understand the database schema (column names and types).
- Use `get_page` to retrieve metadata for a specific Notion page when you have its ID.
- When the user asks about structured data, first `search` for the relevant database, then `get_data_source` to understand its columns, then `query_data_source` to fetch the actual records.
