import chrome from 'ui/chrome';
import Notifier from 'ui/notify/notifier';
import { intersection } from 'lodash';

const notify = new Notifier({ location: 'Scripting Language Service' });

export function getSupportedScriptingLanguages() {
  return ['expression', 'painless'];
}

export function GetEnabledScriptingLanguagesProvider($http) {
  return () => {
    return $http.get(chrome.addBasePath('/api/kibana/scripts/languages'))
    .then((res) => res.data)
    .catch(() => {
      notify.error('Error getting available scripting languages from Elasticsearch');
      return [];
    });
  };
}
