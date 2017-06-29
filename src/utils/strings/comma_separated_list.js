export function parseCommaSeparatedList(input) {
  if (Array.isArray(input)) {
    return input;
  }

  return String(input || '')
    .split(',')
    .map(word => word.trim())
    .filter(Boolean);
}
