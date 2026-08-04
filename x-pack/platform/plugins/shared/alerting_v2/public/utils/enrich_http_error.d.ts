/**
 * Return a new Error whose `.message` is the server's `body.message` when
 * present, keeping the original stack. Falls back to the input error if no
 * body message is available.
 *
 * Use this before passing an HTTP error to `toasts.addError`: the core
 * ErrorToast modal renders its callout from `error.message`, so the useful
 * server message must live there to appear in "See the full error".
 */
export declare const enrichHttpErrorMessage: (error: Error) => Error;
