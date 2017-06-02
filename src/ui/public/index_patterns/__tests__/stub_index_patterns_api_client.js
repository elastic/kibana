import MockLogstashFieldsProvider from 'fixtures/logstash_fields';
import sinon from 'sinon';

import { IndexPatternsApiClientProvider } from '../index_patterns_api_client_provider';

// place in a ngMock.module() call to swap out the IndexPatternsApiClient
export function StubIndexPatternsApiClientModule(PrivateProvider) {
  PrivateProvider.swap(
    IndexPatternsApiClientProvider,
    (Private, Promise) => {
      let nonScriptedFields = Private(MockLogstashFieldsProvider).filter(field => (
        field.scripted !== true
      ));

      class StubIndexPatternsApiClient {
        getFieldsForTimePattern = sinon.spy(() => Promise.resolve(nonScriptedFields));
        getFieldsForWildcard = sinon.spy(() => Promise.resolve(nonScriptedFields));
        testTimePattern = sinon.spy(() => Promise.resolve({
          all: [],
          matches: []
        }))

        swapStubNonScriptedFields = (newNonScriptedFields) => {
          nonScriptedFields = newNonScriptedFields;
        }
      }

      return new StubIndexPatternsApiClient();
    }
  );
}
