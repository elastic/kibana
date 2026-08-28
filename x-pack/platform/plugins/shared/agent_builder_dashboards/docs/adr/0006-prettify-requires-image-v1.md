# v1 Prettify requires an image

The Prettify path (outer agent looks at the screenshot, then one `generate_dashboard`) runs only when the user asked to prettify **and** an image is in the conversation. A typed “make it pretty” with only a dashboard is a normal edit.

This can be relaxed later. v1 does not invent a second Prettify path, so a missing capture cannot silently look like a failed polish.
