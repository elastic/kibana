import { IndexPatternProvider } from '../_index_pattern';

jest.mock('../../errors', () => ({
  SavedObjectNotFound: jest.fn(),
  DuplicateField: jest.fn(),
  IndexPatternMissingIndices: jest.fn(),
}));

jest.mock('../../registry/field_formats', () => ({
  fieldFormats: {
    getDefaultInstance: jest.fn(),
  }
}));

jest.mock('../../utils/mapping_setup', () => ({
  expandShorthand: jest.fn().mockImplementation(() => ({
    id: true,
    title: true,
  }))
}));

jest.mock('../../notify', () => ({
  Notifier: jest.fn().mockImplementation(() => ({
    error: jest.fn(),
  })),
  toastNotifications: {
    addDanger: jest.fn(),
  }
}));

jest.mock('../_format_hit', () => ({
  formatHit: jest.fn().mockImplementation(() => ({
    formatField: jest.fn(),
  }))
}));

jest.mock('../_get', () => ({
  IndexPatternsGetProvider: jest.fn().mockImplementation(() => ({
    clearCache: jest.fn(),
  }))
}));

jest.mock('../_intervals', () => ({
  IndexPatternsIntervalsProvider: jest.fn(),
}));

jest.mock('../_field_list', () => ({
  IndexPatternsFieldListProvider: jest.fn().mockImplementation((pattern) => {
    return {
      byName: {
        id: { value: pattern.id },
        title: { value: pattern.title },
      },
      every: jest.fn(),
    };
  })
}));

jest.mock('../_flatten_hit', () => ({
  IndexPatternsFlattenHitProvider: jest.fn(),
}));

jest.mock('../_pattern_cache', () => ({
  IndexPatternsPatternCacheProvider: {
    clear: jest.fn(),
  }
}));

jest.mock('../fields_fetcher_provider', () => ({
  FieldsFetcherProvider: {
    fetch: jest.fn().mockImplementation(() => ([]))
  }
}));

jest.mock('../unsupported_time_patterns', () => ({
  IsUserAwareOfUnsupportedTimePatternProvider: jest.fn(),
}));


jest.mock('../../saved_objects', () => {
  const object = {
    _version: 1,
    _id: 'foo',
    attributes: {
      title: 'something'
    }
  };

  return {
    SavedObjectsClientProvider: {
      get: async () => object,
      update: async (type, id, body, { version }) => {
        if (object._version !== version) {
          throw {
            statusCode: 409
          };
        }

        object.attributes.title = body.title;

        return {
          id: object._id,
          _version: ++object._version,
        };
      }
    },
    findObjectByTitle: jest.fn(),
  };
});

const Private = arg => arg;
const config = {
  get: jest.fn(),
  watchAll: jest.fn(),
};
const Promise = window.Promise;
const confirmModalPromise = jest.fn();
const kbnUrl = {
  eval: jest.fn(),
};

describe('IndexPattern', () => {
  it('should handle version conflicts', async () => {
    const IndexPattern = IndexPatternProvider(Private, config, Promise, confirmModalPromise, kbnUrl); // eslint-disable-line new-cap

    // Create a normal index pattern
    const pattern = new IndexPattern('foo');
    await pattern.init();

    expect(pattern.version).toBe(2);

    // Create the same one - we're going to handle concurrency
    const samePattern = new IndexPattern('foo');
    await samePattern.init();

    expect(samePattern.version).toBe(3);

    // This will conflict because samePattern did a save (from refreshFields)
    // but the resave should work fine
    pattern.title = 'foo2';
    await pattern.save();

    // This should not be able to recover
    samePattern.title = 'foo3';

    let result;
    try {
      await samePattern.save();
    } catch (err) {
      result = err;
    }

    expect(result.statusCode).toBe(409);
  });
});
