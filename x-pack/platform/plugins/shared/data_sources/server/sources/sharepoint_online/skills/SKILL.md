# SharePoint Online Data Source

The SharePoint Online data source connects to Microsoft SharePoint to search, browse, and read site content. It is the primary tool for accessing enterprise documents, intranet content, and shared resources stored in SharePoint.

## When to Use

Use this skill when the user asks about:
- **Enterprise documents**: Finding policies, procedures, templates, or official documents stored in SharePoint document libraries.
- **Intranet content**: Accessing site pages, news posts, announcements, or team sites published on SharePoint.
- **Shared file libraries**: Browsing and reading files from SharePoint drives, including documents, spreadsheets, and presentations.
- **Cross-site search**: Searching across multiple SharePoint sites for content matching a topic or keyword using Microsoft Graph search with KQL syntax.

## Tips

- Use `search` with KQL (Keyword Query Language) to find content across SharePoint sites. You can filter by entity type (driveItem, listItem, site) and region.
- Use `list` to browse SharePoint resources. Start with `getAllSites` to discover available sites, then drill into site pages, drives, or lists.
- Use `download` to read the contents of specific documents or site pages. Choose the appropriate action: `downloadDriveItem` for files in drives, `downloadItemFromURL` for items by URL, or `getSitePageContents` for site page content.
- When exploring a new SharePoint environment, start with `list` using `getAllSites`, then use `getSiteDrives` or `getSitePages` to understand the structure before searching for specific content.
