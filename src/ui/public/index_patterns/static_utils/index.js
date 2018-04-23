export function getFieldByName(fields, name) {
  return fields.find(field => field.name === name);
}

export function isFilterable(field) {
  return ['string', 'number', 'date', 'ip', 'boolean'].includes(field.type);
}
