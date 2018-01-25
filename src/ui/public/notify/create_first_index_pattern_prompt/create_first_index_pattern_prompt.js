class CreateFirstIndexPatternPrompt {
  constructor() {
    this.isVisible = false;
  }

  show = () => {
    this.isVisible = true;
  }

  hide = () => {
    this.isVisible = false;
  }
}

export const createFirstIndexPatternPrompt = new CreateFirstIndexPatternPrompt();
