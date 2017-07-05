// `crypto` type definitions don't include `crypto.constants`, see available definitions here:
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/node/v6/index.d.ts#L3282
// So we just augment `crypto` module with a subset of crypto.constants we need. See full list here:
// https://nodejs.org/dist/latest-v6.x/docs/api/crypto.html#crypto_node_js_crypto_constants
declare module "crypto" {
  namespace constants {
    export const defaultCoreCipherList: string;
  }
}
