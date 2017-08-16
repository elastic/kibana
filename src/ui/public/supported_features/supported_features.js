import _ from 'lodash';

import chrome from 'ui/chrome';
import { Notifier } from 'ui/notify/notifier';

const notify = new Notifier({ location: 'Supported Features Service' });


export function SupportedFeaturesProvider($http) {
  async function getSupportedFeatures() {
    try {
      const response = await $http.get(chrome.addBasePath('/api/kibana/supported_features'));
      return response.data;
    } catch(error) {
      notify.error(error);
      return {};
    }
  }

  async function isFeatureSupported(feature) {
    const supportedFeatures = await getSupportedFeatures();

    return _.get(supportedFeatures, [feature, 'supported'], false);
  }

  return {
    isFeatureSupported,
  };
}
