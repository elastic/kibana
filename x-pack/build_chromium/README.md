# Chromium headless build

This is the build setup for the headless Chromium used by Kibana reporting.

The build scripts are written in a combination of shell, batch, and Python, with as much as possible in Python. Python was chosen because it's a reasonable cross-platform script, and it's already required by the Chromium build.

Chromium should be built on 3 different machines: Windows, Mac, and a debian flavored Linux such as Ubuntu. Each platform has its own folder with the following files:

- `init.{sh|bat}` - an init script which needs only be run once per VM. In Windows, this requires a GUI and user input.
- `args.gn` - The platform's build arguments

If setting up a VM for the first time, run the `init` script from the appropriate platform folder, e.g. on Linux, you'd run `linux/init.sh`. Once the VM is initialized, you can kick off a build like so:

`python build.py {sha or Chromium version}`

## build.py

The `build.py` script runs the Chromium build. The VM should first have been initialized with the appropriate init script (see the previous section for details).

When it's done, there will be the following build artifacts in a sibling directory:

- `bin/headless_shell` - The raw headless_shell executable
- `bin/headless_shell.zip` - The zipped headless_shell executable
- `bin/headless_shell.md5` - A file containing the md5 hash of the zip file

## Building a Chromium revision

If you have a Chromium revision, such as the one referred to by Puppeteer's `package.json`, you have to convert it to a SHA in order to build it. Put the revision into this URL: https://crrev.com/

For example: https://crrev.com/575458

## Folders

This folder is expected to be copied to the build machines where it will create sibling folders:

```
/build_chromium
  /build.py
  /darwin
    init.sn
    args.gn
  /windows
    init.bat
    args.gn
  /linux
    init.sh
    args.gn
/bin
  headless_shell
  headless_shell.zip
  headless_shell.md5
/depot_tools
/chromium
  /src
    /out/headless
```

## References

The following links provide helpful context about how the Chromium build works, and its prerequisites:

- https://www.chromium.org/developers/how-tos/get-the-code/working-with-release-branches
- https://chromium.googlesource.com/chromium/src/+/master/docs/windows_build_instructions.md
- https://chromium.googlesource.com/chromium/src/+/master/docs/mac_build_instructions.md
- https://chromium.googlesource.com/chromium/src/+/master/docs/linux_build_instructions.md
- The serverless Chromium project was indispensable: https://github.com/adieuadieu/serverless-chrome/blob/b29445aa5a96d031be2edd5d1fc8651683bf262c/packages/lambda/builds/chromium/build/build.sh

## Initializing machines in the cloud

The following are notes on how I ran the build in GCP, and are here just to serve as a reference for setting up VMs initially.

### Linux

In GCP, create a machine with the following parameters:

- Ubuntu 18.04 LTS (not minimal)
- 128GB disk
- 2 vCPUs
- 10GB RAM
- 128GB Disk
- Name: 'chromium-build-linux'
- SSH into the instance:
  - `gcloud compute --project "elastic-kibana-184716" ssh --zone "us-east1-b" "chromium-build-linux"`
  - Create build folder:
    - `mkdir -p ~/chromium/build_chromium`
    - `cd ~/chromium`
- Copy build scripts (from dev machine to instance):
  - `gcloud compute scp --recurse ~/dev/build_chromium/ chip@chromium-build-linux:~/chromium --zone=us-east1-b`
- In Linux VM:
  - Make sure it runs even if you disconnect: `tmux`
  - Initialize: `./build_chromium/linux/init.sh`
  - Build: `python ./build_chromium/build.py 4747cc23ae334a57a35ed3c8e6adcdbc8a50d479`

### Mac

Running the build on mac, you should copy the `x-pack/build_chromium` directory to its own location:

- `mkdir -p ~/dev/chromium/build_chromium`
- `cp -R ~/dev/elastic/kibana/x-pack/build_chromium ~/dev/chromium`
- Run the init command, if you've never done it: `~/dev/chromium/build_chromium/darwin/init.sh`
- Build: `python ~/dev/chromium/build_chromium/build.py 4747cc23ae334a57a35ed3c8e6adcdbc8a50d479`

### Windows

In GCP, create a machine with the following parameters:

- Windows Server 2016 Datacenter (with desktop experience)
- 128GB disk
- 2 vCPUs
- 10GB RAM
- 128GB Disk
- Name: 'chromium-build-windows'
- Once provisioned, click: Set Windows password
- Note the password, as it's only available once
- Click Rdp -> Download RDP File
- Open Microsoft's RDP Connection center (download the RDP app)
- Drag the RDP file to this
- Edit the RDP in the connection center
  - Display -> Resolution (1280 x 960 or something reasonable)
  - Local Resources -> Folders, then select the folder(s) you want to share, this is at least this build scripts folder
  - Save
- Launch the RDP connection
  - Log in n' such
  - Ignore the security warnings (should figure out how to set this up properly)
- Create `C:\chromium\build_chromium`
- Copy the `build_chromium` from x-pack into this location
- Launch cmd
  - `cd /chromium`
  - `build_chromium\windows\init.bat`
  - This will launch the Visual Studio installer, which will have lots of prompts and downloads
  - Under "Individual Components", make sure Windows 10 SDK 10.0.17 is checked (or the latest)
  - Click install and wait a while
  - Once it's installed, open Control Panel and turn on Debugging Tools for Windows:
     - Control Panel → Programs → Programs and Features → Select the “Windows Software Development Kit” → Change → Change → Check “Debugging Tools For Windows” → Change
  - Press enter in the init terminal
- Run the build: `python build_chromium\build.py 4747cc23ae334a57a35ed3c8e6adcdbc8a50d479`
