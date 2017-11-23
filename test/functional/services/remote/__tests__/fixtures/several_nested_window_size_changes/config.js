import { RemoteProvider } from '../../../remote';

export default function () {
  return {
    testFiles: [
      require.resolve('./test'),
    ],
    services: {
      remote: RemoteProvider
    }
  };
}
