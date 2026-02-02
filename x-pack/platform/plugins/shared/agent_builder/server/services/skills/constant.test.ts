import { SKILLS_ENABLED } from "./constants";

describe('skills constants', () => {
  it('should be false', () => {
    // ensures this is not accidentally enabled.
    expect(SKILLS_ENABLED).toBe(false);
  });
});