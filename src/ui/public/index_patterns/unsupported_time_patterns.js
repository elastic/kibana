import { BoundToConfigObjProvider } from 'ui/bound_to_config_obj';

export function UnsupportedTimePatternsProvider(Private, $injector) {
  const BoundToConfigObj = Private(BoundToConfigObjProvider);
  const sessionStorage = $injector.get('sessionStorage');
  const kbnUrl = $injector.get('kbnUrl');
  const Notifier = $injector.get('Notifier');

  const notify = new Notifier({ location: 'Index Patterns' });

  const HISTORY_STORAGE_KEY = 'indexPatterns:warnAboutUnsupportedTimePatterns:history';
  const FLAGS = new BoundToConfigObj({
    enabled: '=indexPatterns:warnAboutUnsupportedTimePatterns'
  });

  return function warnAboutUnsupportedTimePattern(indexPattern) {
    if (!FLAGS.enabled) {
      return;
    }

    const previousIds = sessionStorage.get(HISTORY_STORAGE_KEY) || [];
    if (previousIds.includes(indexPattern.id)) {
      return;
    }

    sessionStorage.set(HISTORY_STORAGE_KEY, [...previousIds, indexPattern.id]);
    notify.warning(
      'Support for time-intervals has been removed. ' +
      `View the ["${indexPattern.id}" index pattern in management](` +
      kbnUrl.getRouteHref(indexPattern, 'edit') +
      ') for more information.'
    );
  };
}
