export function redact(stringToRedact: string, str: string) {
  return str.replace(new RegExp(stringToRedact, 'g'), '<REDACTED>');
}
