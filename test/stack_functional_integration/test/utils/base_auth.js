export function header(user, pass) {
  const encoded = new Buffer(`${user}:${pass}`).toString('base64');
  return `Basic ${encoded}`;
}
