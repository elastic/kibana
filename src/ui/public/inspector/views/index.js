import { viewRegistry } from './registry';

import * as views from './views';

Object.values(views).forEach((view) => viewRegistry.register(view));

export { viewRegistry };
