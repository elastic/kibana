# @kbn/observability-utils

This package contains utilities for Observability plugins. It's a separate package to get out of dependency hell. You can put anything in here that is stateless and has no dependency on other plugins (either directly or via other packages).

The utility functions should be used via direct imports to minimize impact on bundle size and limit the risk on importing browser code to the server and vice versa.
