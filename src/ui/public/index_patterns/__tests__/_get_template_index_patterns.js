import expect from 'expect.js';
import ngMock from 'ng_mock';
import { IndexPatternsGetTemplateIndexPatternsProvider } from 'ui/index_patterns/_get_template_index_patterns';

describe('GetTemplateIndexPatterns', function () {
  let response;
  let getTemplateIndexPatterns;

  beforeEach(ngMock.module('kibana', ($provide) => {
    response = {
      '.ml-state': {
        'index_patterns': [
          '.ml-state'
        ]
      },
      '.watches': {
        'index_patterns': [
          '.watches*'
        ]
      },
    };

    $provide.service('esAdmin', function () {
      return {
        indices: {
          getTemplate: async function () {
            return response;
          }
        }
      };
    });
  }));

  beforeEach(ngMock.inject((Private) => {
    getTemplateIndexPatterns = Private(IndexPatternsGetTemplateIndexPatternsProvider);
  }));

  it('should be a function', function () {
    expect(getTemplateIndexPatterns).to.be.a(Function);
  });

  it('should get all indices', async function () {
    const indices = await getTemplateIndexPatterns();
    expect(indices).to.contain('.ml-state');
    expect(indices).to.contain('.watches*');
  });
});
