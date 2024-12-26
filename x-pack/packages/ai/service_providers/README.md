# @kbn/ai-service-providers

This package contains static information about AI service providers that can be used in Kibana:

- IDs
- Names
- Logos
- Connector types
- Supported solutions

## Logos

Logos for each Service Provider are stored in the `logos` directory of the package.  They can be imported directly for static imports:

```ts
import GeminiLogoSVG from '@kbn/ai-service-providers/logos/gemini.svg';
import GeminiLogoComponent from '@kbn/ai-service-providers/logos/gemini';
```

They can also be loaded asynchronously, in one of three formats:

```tsx
// Returns a lazily-loaded logo as a React component, already wrapped in a Suspense boundary.
const Gemini = getReactComponentLogo('gemini');

return (
  <div><Logo /></div>
);

// Returns a base64-encoded logo as a string.
const gemini = await getBase64Logo('gemini');

return <EuiIcon type={gemini} />;

// Returns a logo as a URL to a static asset.
// This means the logo *will not* respond to dark mode changes.
const gemini = await getUrlLogo('gemini');

return <EuiIcon type={gemini} />;
```

## Note

This package is an extraction of information from `@kbn/stack-connectors-plugin` relevant to `@kbn/ai-assistant`.  It is intended to be used by the AI Assistant to display a list of available AI service providers to the user.

We can move more or all of this information from `@kbn/stack-connectors-plugin` to this package, if others agree that a centralized location for this information is prudent.