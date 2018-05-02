import chrome from '../chrome';
import { Notifier } from '../notify';

const notify = new Notifier({ location: 'Scripting Language Service' });

export function getSupportedScriptingLanguages() {
  return ['painless'];
}

export function getDeprecatedScriptingLanguages() {
  return ['expression'];
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
