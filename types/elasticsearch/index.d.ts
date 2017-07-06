// Augmentation of Elasticsearch module with methods and properties that
// are not yet available in the official type definition set:
// https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/elasticsearch
declare module Elasticsearch {
  interface Client {
    close(): Promise<any>;
  }
}
