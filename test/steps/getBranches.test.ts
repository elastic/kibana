import { getBranches } from '../../src/steps/getBranches';
import * as prompts from '../../src/services/prompts';

describe('getBranches', () => {
  let promptSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    promptSpy = spyOn(prompts, 'promptForBranches').and.returnValue([
      'branchA'
    ]);
  });

  describe('when `options.branches` is empty', () => {
    let branches: ReturnType<typeof getBranches>;

    beforeEach(() => {
      branches = getBranches({
        branches: [],
        branchChoices: ['branchA', 'branchB'],
        multipleBranches: false
      } as any);
    });

    it('should return branches from prompt', () => {
      expect(branches).toEqual(['branchA']);
    });

    it('should call prompt with correct args', () => {
      expect(promptSpy).toHaveBeenLastCalledWith(['branchA', 'branchB'], false);
    });
  });

  describe('when `options.branches` is not empty', () => {
    let branches: ReturnType<typeof getBranches>;

    beforeEach(() => {
      branches = getBranches({
        branches: ['branchA', 'branchB'],
        branchChoices: [],
        multipleBranches: false
      } as any);
    });

    it('should return branches from `options.branches`', () => {
      expect(branches).toEqual(['branchA', 'branchB']);
    });

    it('should not call prompt', () => {
      expect(promptSpy).not.toHaveBeenCalled();
    });
  });
});
