export function parseCommaSeparatedList(input) {
  if (Array.isArray(input)) return input;

  const source = String(input || '').split(',');
  const list = [];
  while (source.length) {
    const item = source.shift().trim();
    if (item) list.push(item);
  }

  return list;
}
