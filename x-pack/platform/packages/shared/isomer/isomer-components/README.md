# @kbn/isomer-components

Kibana's [Isomer](https://github.com/elastic/isomer) pack of content and layout primitives, for React, HTML, Markdown, text, and Slack Block Kit.

## Component Primitives

- `markdown`: GitHub-flavored Markdown.
  - `{ type: 'markdown', text }`, the same node as Agent Builder's `MarkdownNode`.
  - React and HTML render with the SDK's `renderMarkdownContent`, from the same parse as `md.authored`: raw HTML is text, `href` and `src` are sanitized, and source past the parse budget is inert text.
  - Markdown and Slack use `md.authored`, so GFM tables become Slack `table` blocks.
- `header`: a message title, or a section label with `level` 1 to 4.
  - `{ type: 'header', text, level? }`. Slack gets a `header` block, clamped to 150 characters; React and Markdown nest it below the composition title.
  - To label content, use a `section`.
- `section`: a labeled part of a message, holding its content.
  - `{ type: 'section', title, collapsible?, body }`, with `body` one or more nodes, authored as JSX children. Slack gets a `container` block, collapsible when `collapsible` is set; a body Slack can't fit in one falls back to a level 3 `header` and its blocks. React and Markdown render the title at a level 3 `header`'s depth.
- `context`: a line of small, secondary facts.
  - `{ type: 'context', items: [{ text }] }`, 1 to 10 plain-text items. Slack gets one escaped `mrkdwn` element, clamped to 2,000 characters; other surfaces join the items with ` · `.
  - Plain text reaches every surface as written, so use Unicode emoji (⚠️), not Slack shortcodes (`:warning:`).
- `divider`: a rule between sections, `{ type: 'divider' }`. Slack gets a `divider` block, React an `<hr>`, Markdown and text `---`.
- `quote`: a quoted passage, such as a conclusion.
  - `{ type: 'quote', text }`, plain text up to 3,000 characters, with line breaks kept. Slack gets one `rich_text` block with a `rich_text_quote`, so the text needs no `mrkdwn` escaping.
  - To title it, put it in a `section`.
- `actions`: up to 5 link buttons, such as "View Full Investigation".
  - `{ type: 'actions', buttons: [{ label, url, primary? }] }`. Slack gets an `actions` block of URL buttons, with labels clamped to 75 characters; other surfaces render links.
  - `url` follows the navigation policy, so a relative path works in React and HTML. Slack can't open one, so it drops that button, and the block when no button is left. Hosts resolve Kibana paths to absolute URLs before building the node.
- `link`: one link, to a page in Kibana or on the web, such as "Open in Discover".
  - `{ type: 'link', label, app, path? }` for a Kibana app path, or `{ type: 'link', label, url }` for an absolute URL. Slack gets an inline `mrkdwn` link in a `section`, or a `rich_text` link when the escaped URL won't fit one.
  - Each host resolves an app path. React calls `resolveAppLink({ app, path })` from the render context (`ComponentsRenderContext`), such as `application.getUrlForApp` in the browser. Slack joins `/app/{app}{path}` onto the render's `baseUrl` (`runtime.surfaces.slack.render(composition, { baseUrl })`), keeping its base path and space, so pass the space-aware Kibana URL. Text and Markdown have no host input, so only `url` links render there.
  - A link that doesn't resolve renders nothing. Unlike `actions`, it isn't a call to action.
- `fields`: up to 10 labeled values, such as an app and a time range.
  - `{ type: 'fields', items: [{ label, value }] }`. `value` is plain text, or `{ raw, format?, precision?, currency? }` formatted by the SDK's `formatDisplayValue` the same on every surface. Slack gets one `section` with a `mrkdwn` field per item, the value clamped after escaping to 2,000 characters.
- `code`: code or source shown as written, such as an ES|QL query.
  - `{ type: 'code', text, language? }`, up to 12,000 characters. Slack gets a `rich_text_preformatted` block, which needs no escaping and splits past 3,000 characters; Markdown gets a fence longer than any backtick run.
- `table`: rows of values under column headings.
  - `{ type: 'table', columns: [{ label, format?, precision?, currency?, align? }], rows, sort?, maxRows?, totalRows? }`, 1 to 20 columns and up to 1,000 rows of text, numbers or `null`. Numbers align right by default. Rows are sorted, then cut to `maxRows`, with a "Showing N of M rows" note; `totalRows` counts rows the caller already left out.
  - JSX: `<Table.Column format="number">Errors</Table.Column>` per column, and a `<Table.Row>` per row with one expression per cell, `{'checkout'}{1284}{null}`, or `cells={['checkout', 1284, null]}`. Expressions keep a number a number; text children would make it a string. `columns` and `rows` props work too.
  - Slack gets a native `table` block of up to 99 rows under the header, cut by row before its cells pass Slack's 10,000-character budget, so it stays a table.

There's no list primitive. For a list built from data, such as a graph's nodes, build Markdown with the SDK's `md.list` and `serializeMarkdown` (`@elastic/isomer-sdk/markdown`), which escape each item, and put it in a `markdown` node.

React and HTML are styled with [`@kbn/isomer-theme`](../isomer-theme): each primitive has a style module on Borealis tokens, and the pack's `styleAdapter` emits the CSS a render uses under the `.isomer` root, in light and dark. Rendered through `createKibanaIsomerRuntime`, React output is styled with no further setup.

Each primitive is a folder under `src/primitives/`, registered in `src/pack.ts`. `src/pack.test.ts` checks that registration and runs conformance for every example on every surface.

## Isomer Studio

`isomer_studio.config.ts` loads the pack, through `createKibanaIsomerRuntime`, into [Isomer Studio](https://github.com/elastic/isomer/tree/main/packages/isomer-studio), which isn't a Kibana dependency. From this directory, `npx @elastic/isomer-studio --config isomer_studio.config.ts` opens it, and `npx @elastic/isomer-studio check --config isomer_studio.config.ts` renders every example on every surface without a browser.

Studio image previews use Kibana's Inter and Roboto Mono fonts through `isomer_studio_fonts.ts`.
