// browsers format Error.stack differently; always include message
export function formatStack(err) {
  if (err.stack && !~err.stack.indexOf(err.message)) {
    return 'Error: ' + err.message + '\n' + err.stack;
  }
  return err.stack;
}
