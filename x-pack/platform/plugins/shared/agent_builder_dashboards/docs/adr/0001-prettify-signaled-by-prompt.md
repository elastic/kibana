# Prettify is signaled by the prompt, not the image type

Prettify uses a generic image attachment (Files / `file_id`) as visual evidence. The auto-sent user prompt is what selects the Prettify path. The dashboard-management skill tells the outer agent to look at the screenshot and apply corrections with one `platform.dashboard.generate_dashboard` call. `platform.dashboard.prettify_dashboard` is not registered.

A distinct `dashboard_screenshot` type would keep Prettify off unrelated image chats, but `getInlineTools` cannot see conversation metadata today, and we do not want Prettify identity to live on a file type. The cost is that any image chat with this skill loaded could look like polish; the skill fail-closes: without an image, treat it as a normal dashboard edit.
