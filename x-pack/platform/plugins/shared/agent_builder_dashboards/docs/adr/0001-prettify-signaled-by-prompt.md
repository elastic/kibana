# Prettify is signaled by the prompt, not the image type

Prettify uses a generic image attachment (Files / `file_id`) as visual evidence. The auto-sent user prompt is what selects the Prettify playbook. Panel Review is a skill-inline tool on dashboard-management, not bound to a dedicated screenshot type.

A distinct `dashboard_screenshot` type would keep Panel Review off unrelated image chats, but `getInlineTools` cannot see conversation metadata today, and we do not want Prettify identity to live on a file type. The cost is that Panel Review is registered whenever the skill loads; the skill text and a fail-closed handler (dashboard + image required) are what stop misuse.
