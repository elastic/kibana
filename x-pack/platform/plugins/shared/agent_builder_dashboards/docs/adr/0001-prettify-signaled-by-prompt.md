# Prettify is signaled by the prompt, not the image type

Prettify uses a generic image attachment (Files / `file_id`) as visual evidence. The auto-sent user prompt is what selects the Prettify path. The dashboard-management skill tells the outer agent to look at the screenshot and apply corrections with one Generate.

A distinct `dashboard_screenshot` type would keep Prettify off unrelated image chats, but skill tools cannot see conversation metadata today, and Prettify identity should not live on a file type. Without an image, treat the request as a normal dashboard edit.
