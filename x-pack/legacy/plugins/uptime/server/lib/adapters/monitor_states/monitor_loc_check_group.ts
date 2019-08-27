export type MonitorLocCheckGroup = {
  monitorId: string;
  location: string | null;
  filterMatchesLatest: boolean;
  checkGroup: string;
  timestamp: Date;
  up: number;
  down: number;
  status: 'up' | 'down';
};
