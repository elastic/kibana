import { MonitorLocCheckGroup } from './monitor_loc_check_group';
export type MonitorIdWithGroups = {
  id: string;
  matchesFilter: boolean;
  groups: MonitorLocCheckGroup[];
};
