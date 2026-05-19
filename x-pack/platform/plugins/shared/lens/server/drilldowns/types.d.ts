import type { DrilldownState } from '@kbn/embeddable-plugin/server';
import type { TypeOf } from '@kbn/config-schema';
import type { discoverDrilldownSchema } from './register_discover_drilldown';
export type DiscoverDrilldownState = DrilldownState & TypeOf<typeof discoverDrilldownSchema>;
