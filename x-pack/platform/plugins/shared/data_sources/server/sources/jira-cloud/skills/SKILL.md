# Jira Cloud Data Source

The Jira Cloud data source connects to Atlassian Jira to search issues, browse projects, and look up users. It is the primary tool for accessing project management data, issue tracking, and team workload information stored in Jira.

## When to Use

Use this skill when the user asks about:
- **Issue tracking**: Finding bugs, feature requests, tasks, or any Jira issues by keyword, status, assignee, or other criteria.
- **Project status**: Understanding the state of a project, what's in progress, what's blocked, or what was recently completed.
- **Sprint and release planning**: Querying issues by sprint, fix version, priority, or custom fields using JQL.
- **Team workload**: Finding who is assigned to what, searching for a user's open issues, or looking up team members.

## Tips

- Use `search_issues_with_jql` for powerful issue queries. JQL supports filtering by project, status, assignee, labels, sprint, priority, and more. Examples: `project = "ENG" AND status = "In Progress"`, `assignee = currentUser() AND resolution = Unresolved`.
- Use `get_projects` to discover available projects or search for a project by name.
- Use `get_resource` with `resourceType: "issue"` to fetch full details of a specific issue by its key (e.g., `ENG-1234`) or ID.
- Use `search_users` to find users by name, username, or email when the user needs to look up team members or assignees.
- When the user asks about project status, start with `get_projects` to find the project, then `search_issues_with_jql` to query its issues with appropriate status filters.
