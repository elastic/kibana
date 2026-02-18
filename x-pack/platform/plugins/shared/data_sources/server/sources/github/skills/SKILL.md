# GitHub Data Source

The GitHub data source connects to GitHub repositories via the GitHub Copilot MCP API and native GitHub connector. It is the primary tool for answering questions grounded in source code, engineering discussions, and development history.

## When to Use

Use this skill when the user asks about:
- **Code and repositories**: Finding specific files, functions, classes, or code patterns across repositories. Searching for how a feature is implemented or where a bug might live.
- **Engineering discussions**: Locating relevant issues, pull request reviews, and comments where decisions were made or problems were discussed.
- **Development history**: Understanding when a feature was added, who contributed changes, what was included in a release, or how code evolved over time through commits and branches.
- **Project organization**: Exploring repository structure, branches, tags, releases, labels, and team membership.

## Tips

- Use `search` with `search_code` to find specific code patterns, function definitions, or configuration values across repositories.
- Use `search` with `search_issues` or `search_pull_requests` to find discussions about a topic. GitHub query syntax supports filtering by label, author, assignee, state, and more.
- Use `get_doc` to retrieve the full contents of a specific file when you know the repository, owner, and path.
- Use `list_commits` and `list_pull_requests` to trace the history of changes and understand the timeline of development.
- When looking for "when was X added," combine `search_code` to find the file, then `list_commits` to trace its history.
