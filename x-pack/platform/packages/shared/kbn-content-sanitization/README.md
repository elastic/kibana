# @kbn/content-sanitization

Server-side sanitizers for user-supplied content that Kibana stores and later serves or renders.

## SVG

`sanitizeSvg` runs an SVG through DOMPurify with a strict SVG profile. It removes scripts, event handlers, `<style>`,
`<foreignObject>`, and every `href` / `xlink:href`. Before DOMPurify runs, it copies a safe subset of `<style>` rules
onto the matching elements as presentation attributes, so icons that color their shapes with CSS classes still render.
If that step can't keep the SVG intact, it falls back to the plain DOMPurify result.

`@kbn/fs` calls it on every `.svg` file it writes. Call it directly for SVG content that is stored somewhere else.

```typescript
import { sanitizeSvg } from '@kbn/content-sanitization';

const cleanSvg = sanitizeSvg(Buffer.from(svgString));
```

`jsdom` and `dompurify` load lazily on the first call, so processes that never sanitize an SVG don't pay their startup
cost.

## Image data URLs

`sanitizeImageDataUrl` handles images stored as `data:` URLs, such as space and user profile avatars. It decodes an
`image/svg+xml` data URL (base64 or percent-encoded), runs `sanitizeSvg`, and re-encodes the result as base64. Any
other value, including raster data URLs, is returned unchanged. It throws when an SVG payload can't be decoded or
sanitized.

```typescript
import { sanitizeImageDataUrl } from '@kbn/content-sanitization';

const cleanImageUrl = sanitizeImageDataUrl(space.imageUrl);
```
