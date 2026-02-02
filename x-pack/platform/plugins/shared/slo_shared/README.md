# SLO Shared Plugin

This plugin provides shared SLO functionality that can be consumed by multiple plugins (e.g., SLO, Fleet).

## Features

- Registers the `slo_template` saved object type

## Usage

Add `sloShared` to your plugin's `requiredPlugins` in `kibana.jsonc`:

```jsonc
{
  "plugin": {
    "requiredPlugins": ["sloShared"]
  }
}
```

Then import the saved object type constant:

```typescript
import { SO_SLO_TEMPLATE_TYPE } from '@kbn/slo-shared-plugin/common';
```

