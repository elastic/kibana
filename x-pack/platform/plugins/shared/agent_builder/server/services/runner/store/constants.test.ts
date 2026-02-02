import { FILESTORE_ENABLED } from "./constants";

describe('runner store constants', () => {
  it('should be false', () => {
    // ensures this is not accidentally enabled.
    expect(FILESTORE_ENABLED).toBe(false);
  });
});