import { StubIndexPatternProvider } from './index_pattern';
import { createStubLogstashFields } from './logstash_fields';
import { getKbnFieldType } from '../../../../../utils';

export function StubLogstashIndexPatternProvider(Private) {
  const StubIndexPattern = Private(StubIndexPatternProvider);
  const mockLogstashFields = createStubLogstashFields();

  const fields = mockLogstashFields.map(function (field) {
    const kbnType = getKbnFieldType(field.type);

    if (kbnType.name === 'unknown') {
      throw new TypeError(`unknown type ${field.type}`);
    }

    return {
      ...field,
      sortable: ('sortable' in field) ? !!field.sortable : kbnType.sortable,
      filterable: ('filterable' in field) ? !!field.filterable : kbnType.filterable,
      displayName: field.name,
    };
  });

  const indexPattern = new StubIndexPattern('logstash-*', 'time', fields);
  indexPattern.id = 'logstash-*';

  return indexPattern;

}
