import chrome from 'ui/chrome';
import Notifier from 'ui/notify/notifier';

const notify = new Notifier({ location: 'Scripting Lang Service' });

export function getSupportedScriptingLangs() {
  return ['expression', 'painless'];
}

export function GetEnabledScriptingLangsProvider($http) {
  return () => {
    return $http.get(chrome.addBasePath('/api/kibana/scripts/languages'))
    .then((res) => res.data)
    .catch(() => {
      notify.error('Error getting available scripting languages from Elasticsearch');
      return [];
    });
  };
}

