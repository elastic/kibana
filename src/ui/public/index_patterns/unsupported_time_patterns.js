import { BoundToConfigObjProvider } from '../bound_to_config_obj';

export function IsUserAwareOfUnsupportedTimePatternProvider(Private, $injector) {
  const BoundToConfigObj = Private(BoundToConfigObjProvider);
  const sessionStorage = $injector.get('sessionStorage');

  const HISTORY_STORAGE_KEY = 'indexPatterns:warnAboutUnsupportedTimePatterns:history';
  const FLAGS = new BoundToConfigObj({
    enabled: '=indexPatterns:warnAboutUnsupportedTimePatterns'
  });

  return function isUserAwareOfUnsupportedTimePattern(indexPattern) {
    // The user's disabled the notification. They know about it.
    if (!FLAGS.enabled) {
      return true;
    }

    // We've already told the user.
    const previousIds = sessionStorage.get(HISTORY_STORAGE_KEY) || [];
    if (previousIds.includes(indexPattern.id)) {
      return true;
    }

    // Let's store this for later, so we don't tell the user multiple times.
    sessionStorage.set(HISTORY_STORAGE_KEY, [...previousIds, indexPattern.id]);
    return false;
  };
}
