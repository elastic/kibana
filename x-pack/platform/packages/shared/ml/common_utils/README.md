# @kbn/ml-common-utils

Shared utility functions for ML data transformation, validation, and common operations used across the ML packages and plugins.

## Bundle Size Considerations

```typescript
// Use specific imports to reduce bundle size
import { isValidJobId } from '@kbn/ml-common-utils/job_utils';
import { escapeForElasticsearchQuery } from '@kbn/ml-common-utils/string_utils/escape_for_elasticsearch_query';

// Rather than importing everything
// import * from '@kbn/ml-common-utils'; // Avoid this
```

## Related Packages

- `@kbn/ml-common-types` - Type definitions for these utilities
- `@kbn/ml-common-constants` - Constants used by these utilities
- `@kbn/ml-anomaly-utils` - Anomaly-specific utility functions
