# Getting Started modules

The Getting Started modules in this folder aid the content on Kibana's Getting Started page.

## Modules

Below are the modules in this folder intended for public consumption.

### `opt_out_directive`

This module defines an Angular attribute directive, `kbnGettingStartedOptOut`. It should be used to decorate any clickable elements on the Getting Started page that would cause the user to opt-out of the Getting Started page (that is, never be shown that page again on Kibana startup).

When the user clicks the decorated element, the user's decision to opt out of the Getting Started page will be recorded.

#### Example Usage

```javascript
import 'ui/public/getting_started/opt_out_directive';
```

```html
<a
  href="/some/link"
  kbn-getting-started-opt-out
>Take me away!</a>
```

### `registry`

This module exports several functions that will allow code (e.g. other plugins such as in x-pack) to dynamically register content into specific sections of the Getting Started page. Refer to the `export`s in the module for usage details.