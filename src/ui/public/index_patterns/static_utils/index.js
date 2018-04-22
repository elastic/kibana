export function getFieldByName(fields, name) {
  return fields.find(field => field.name === name);
}
