# Prettify is signaled by the prompt, not the image type

Prettify uses a generic image attachment (Files / `file_id`) as visual evidence. The auto-sent user prompt is what selects the Prettify path. `platform.dashboard.prettify_dashboard` is a skill-inline tool on dashboard-management: it inspects the image (Dashboard Review), an inner planner writes generate operations, and the shared generate core applies them. It is not bound to a dedicated screenshot type.

A distinct `dashboard_screenshot` type would keep Prettify off unrelated image chats, but `getInlineTools` cannot see conversation metadata today, and we do not want Prettify identity to live on a file type. The cost is that the Prettify tool is registered whenever the skill loads; a short stub plus a fail-closed handler (dashboard + image required) are what stop misuse.
