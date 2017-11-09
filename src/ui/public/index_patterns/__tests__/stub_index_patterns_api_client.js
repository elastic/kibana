import { createStubLogstashFields } from './stubs';
import sinon from 'ui/sinon';

import { IndexPatternsApiClientProvider } from '../index_patterns_api_client_provider';

// place in a ngMock.module() call to swap out the IndexPatternsApiClient
export function StubIndexPatternsApiClientModule(PrivateProvider) {
  PrivateProvider.swap(
    IndexPatternsApiClientProvider,
    (Promise) => {
      let nonScriptedFields = createStubLogstashFields().filter(field => (
        field.scripted !== true
      ));

      class StubIndexPatternsApiClient {
        getFieldsForTimePattern = sinon.spy(() => Promise.resolve(nonScriptedFields));
        getFieldsForWildcard = sinon.spy(() => Promise.resolve(nonScriptedFields));

        swapStubNonScriptedFields = (newNonScriptedFields) => {
          nonScriptedFields = newNonScriptedFields;
        }
      }

      return new StubIndexPatternsApiClient();
    }
  );
}
