class MissingIndicesMessage {
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

export const missingIndicesMessage = new MissingIndicesMessage();
