import { KBN_FIELD_TYPES } from '../../../../utils/kbn_field_types';

export function getFieldByName(fields, name) {
  return fields.find(field => field.name === name);
}

const filterableTypes = KBN_FIELD_TYPES.filter(type => type.filterable).map(
  type => type.name
);

export function isFilterable(field) {
  return filterableTypes.includes(field.type);
}

export function getFromSavedObject(savedObject) {
  return {
    fields: JSON.parse(savedObject.attributes.fields),
    title: savedObject.attributes.title,
  };
}

export function getFromLegacyIndexPattern(indexPatterns) {
  return indexPatterns.map(indexPattern => ({
    fields: indexPattern.fields.raw,
    title: indexPattern.title,
  }));
}
