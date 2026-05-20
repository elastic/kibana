import type { PluginInitializerContext } from '@kbn/core/public';
import { StackAlertsPublicPlugin } from './plugin';
export { DataViewSelectPopover } from './rule_types/components/data_view_select_popover';
export declare const plugin: (initializerContext: PluginInitializerContext) => StackAlertsPublicPlugin;
