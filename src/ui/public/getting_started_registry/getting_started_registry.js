export class GettingStartedRegistry {
  constructor() {
    this.topMessage = null;
    this._manageAndMonitorMessages = [];
  }

  /**
   * Sets the top message on the Getting Started page
   *
   * @param {string} message Top message string
   */
  setTopMessage = (message) => {
    this.topMessage = message;
  }

  /**
   * Unsets the top message on the Getting Started page
   */
  unsetTopMessage = () => {
    this.topMessage = null;
  }

  /**
   * Adds a message to the Manage and Monitor section of the Getting Started page
   *
   * @param {string} message Message string
   * @return {string} And ID for the message that was added. This can be used later to remove the message.
   */
  addManageAndMonitorMessagesMessage = (message) => {
    const id = crypto.createHash('md5')
      .update(message)
      .digest('hex');

    this._manageAndMonitorMessages.push({
      id,
      message
    });

    return id;
  }

  /**
   * Removes the specified message from the Manage and Monitor section of the Getting Started page
   *
   * @param {string} id ID of the message to be removed
   * @throws Error if message with specified ID is not found
   */
  removeManageAndMonitorMessage = (id) => {
    const messageIndex = this._manageAndMonitorMessages.findIndex(item => item.id === id);

    if (!messageIndex) {
      throw new Error(`No message with id = ${id} found`);
    }

    this._manageAndMonitorMessages.splice(messageIndex, 1);
  }

  get manageAndMonitorMessages() {
    return this._manageAndMonitorMessages.map(messageObj => messageObj.message);
  }
}