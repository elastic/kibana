import os, hashlib, platform, sys

# This file contains various utility functions used by the init and build scripts

def runcmdsilent(cmd):
  """Executes a string command in the shell"""
  print(' > ' + cmd)
  return os.system(cmd)

def runcmd(cmd):
  """Executes a string command in the shell"""
  print(' > ' + cmd)
  result = os.system(cmd)
  if result != 0:
    raise Exception(cmd + ' returned ' + str(result))

def mkdir(dir):
  print(' > mkdir -p ' + dir)
  """Makes a directory if it doesn't exist"""
  if not os.path.exists(dir):
    return os.makedirs(dir)

def md5_file(filename):
  """Builds a hex md5 hash of the given file"""
  md5 = hashlib.md5()
  with open(filename, 'rb') as f:
    for chunk in iter(lambda: f.read(128 * md5.block_size), b''):
      md5.update(chunk)
  return md5.hexdigest()

def configure_environment(arch_name, build_path, src_path):
  """Runs install scripts for deps, and configures temporary environment variables required by Chromium's build"""

  if platform.system() == 'Linux':
    if arch_name:
      print('Running sysroot install script...')
      sysroot_cmd = src_path + '/build/linux/sysroot_scripts/install-sysroot.py --arch=' + arch_name
      runcmd(sysroot_cmd)
    print('Running install-build-deps...')
    runcmd(src_path + '/build/install-build-deps.sh')

  depot_tools_path = os.path.join(build_path, 'depot_tools')
  full_path = depot_tools_path + os.pathsep + os.environ['PATH']
  print('Updating PATH for depot_tools: ' + full_path)
  os.environ['PATH'] = full_path
