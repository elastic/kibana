import expect from 'expect.js';
import ngMock from 'ng_mock';
import { IndicesGetTemplateIndexPatternsProvider } from 'ui/indices/get_template_index_patterns';

function NotFoundError() {
  this.status = 404;
}

describe('GetTemplateIndexPatterns', function () {
  let throw404 = false;
  let throwOther = false;
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
      '.watches2': {
        'index_patterns': [
          '.watches*'
        ]
      },
    };

    $provide.service('esAdmin', function () {
      return {
        indices: {
          getTemplate: async function () {
            if (throw404) {
              throw new NotFoundError();
            }
            if (throwOther) {
              throw new Error();
            }
            return response;
          }
        }
      };
    });
  }));

  beforeEach(ngMock.inject((Private) => {
    getTemplateIndexPatterns = Private(IndicesGetTemplateIndexPatternsProvider);
  }));

  it('should be a function', function () {
    expect(getTemplateIndexPatterns).to.be.a(Function);
  });

  it('should get all index patterns', async function () {
    const indices = await getTemplateIndexPatterns();
    expect(indices).to.contain('.ml-state');
    expect(indices).to.contain('.watches*');
  });

  it('should prevent duplicates', async function () {
    const indices = await getTemplateIndexPatterns();
    expect(indices).to.contain('.watches*');
    expect(indices.length).to.be(2);
  });

  it('should suppress a 404 response', async function () {
    throw404 = true;
    const indices = await getTemplateIndexPatterns();
    expect(indices.length).to.be(0);
    throw404 = false;
  });

  it('should not suppress a 404 response if told not to', async function () {
    throw404 = true;

    let errorThrown = false;
    try {
      await getTemplateIndexPatterns(null, false);
    } catch (e) {
      errorThrown = true;
    }
    expect(errorThrown).to.be(true);

    throw404 = false;
  });

  it('should not suppress a non 404 response', async function () {
    throwOther = true;

    let errorThrown = false;
    try {
      await getTemplateIndexPatterns();
    } catch (e) {
      errorThrown = true;
    }
    expect(errorThrown).to.be(true);
    throwOther = false;
  });
});
