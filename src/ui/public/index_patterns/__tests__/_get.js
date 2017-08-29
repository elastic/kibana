import expect from 'expect.js';
import { IndexPatternsGetProvider } from 'ui/index_patterns/_get';

describe('IndexPatternsGetProvider', function () {

  const indexPatterns = [
    {
      id: 'id1',
      attributes: {
        title: 'title1'
      }
    },
    {
      id: 'id2',
      attributes: {
        title: 'title2'
      }
    }
  ];
  const savedObjectsClientMock = {
    find: (options) => {
      expect(options.type).to.equal('index-pattern');
      return new Promise((resolve) => {
        setTimeout(() => {
          const resp = {
            savedObjects: indexPatterns
          };
          resolve(resp);
        }, 0);
      });
    }
  };
  const privateMock = (provider) => {
    expect(provider.name).to.equal('SavedObjectsClientProvider');
    return savedObjectsClientMock;
  };

  let getProvider;
  beforeEach(() => {
    expect(IndexPatternsGetProvider).to.be.an('function');
    getProvider = IndexPatternsGetProvider(privateMock); // eslint-disable-line new-cap
    expect(getProvider).to.be.an('function');
  });

  describe('get field', function () {
    let getTitles;
    beforeEach(() => {
      getTitles = getProvider('attributes.title');
      expect(getTitles).to.be.an('function');
    });
    it('should return array of field values', async () => {
      const titles = await getTitles();
      expect(titles).to.be.an(Array);
      expect(titles.join()).to.equal('title1,title2');
    });
  });

  describe('get index patterns', function () {
    let getIndexPatterns;
    beforeEach(() => {
      getIndexPatterns = getProvider();
      expect(getIndexPatterns).to.be.an('function');
    });
    it('should return array of saved objects', async () => {
      const savedObjects = await getIndexPatterns();
      expect(savedObjects).to.be.an(Array);
      expect(JSON.stringify(savedObjects)).to.equal(JSON.stringify(indexPatterns));
    });
  });

});
